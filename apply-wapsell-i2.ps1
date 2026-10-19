$ErrorActionPreference = 'Stop'

$repo = 'D:\Software Development\Porfolio\OtraRondaMas'
Set-Location -LiteralPath $repo

$servicePath = Join-Path $repo 'apps\api\src\messaging\messaging.service.ts'
$specPath = Join-Path $repo 'apps\api\src\messaging\messaging.service.spec.ts'

foreach ($path in @($servicePath, $specPath)) {
  if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
    throw "Precondition failed: missing file $path"
  }
}

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backupDir = Join-Path $repo ".i2-backup-$stamp"
New-Item -ItemType Directory -Path $backupDir | Out-Null
Copy-Item -LiteralPath $servicePath -Destination (Join-Path $backupDir 'messaging.service.ts')
Copy-Item -LiteralPath $specPath -Destination (Join-Path $backupDir 'messaging.service.spec.ts')

function Replace-ExactlyOnce([string]$Text, [string]$Old, [string]$New, [string]$Label) {
  $count = ([regex]::Matches($Text, [regex]::Escape($Old))).Count
  if ($count -ne 1) {
    throw "Precondition failed for '$Label': expected exactly one anchor, found $count. No patch should be applied."
  }
  return $Text.Replace($Old, $New)
}

# Normalize only in memory; restore each file's original newline convention on write.
$serviceOriginal = [System.IO.File]::ReadAllText($servicePath)
$specOriginal = [System.IO.File]::ReadAllText($specPath)
$serviceNewline = if ($serviceOriginal.Contains("`r`n")) { "`r`n" } else { "`n" }
$specNewline = if ($specOriginal.Contains("`r`n")) { "`r`n" } else { "`n" }
$service = $serviceOriginal.Replace("`r`n", "`n")
$spec = $specOriginal.Replace("`r`n", "`n")

$serviceAnchor = @'
        if (existing) {
          return this.assertSameContentOrConflict(existing, content, replyToMessageId);
        }

        const last = await tx.message.findFirst({
'@
$serviceReplacement = @'
        if (existing) {
          return this.assertSameContentOrConflict(existing, content, replyToMessageId);
        }

        // I-2: retain the conversation and its history when a DIRECT participant leaves,
        // but reject new sends until two participants are active again. Keep this AFTER
        // idempotency resolution so a retry of an already-persisted send remains safe.
        if (conversation.type === MessagingConversationType.DIRECT) {
          const activeParticipants = await tx.conversationParticipant.count({
            where: {
              conversationId,
              businessId: context.businessId,
              leftAt: null,
              removedAt: null,
            },
          });
          if (activeParticipants < 2) {
            throw new ConflictException(
              'No se pueden enviar mensajes en una conversacion DIRECT con menos de 2 participantes activos',
            );
          }
        }

        const last = await tx.message.findFirst({
'@
$service = Replace-ExactlyOnce $service $serviceAnchor $serviceReplacement 'DIRECT send guard'

$beforeEachAnchor = @'
  beforeEach(() => {
    jest.clearAllMocks();
    service = new MessagingService(prisma as any, businessContext as any);
  });
'@
$beforeEachReplacement = @'
  beforeEach(() => {
    jest.clearAllMocks();
    prisma.conversationParticipant.count.mockResolvedValue(2);
    service = new MessagingService(prisma as any, businessContext as any);
  });
'@
$spec = Replace-ExactlyOnce $spec $beforeEachAnchor $beforeEachReplacement 'default participant-count mock'

$successfulSendAnchor = @'
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue({
      id: 'participant-a',
      userId: 'user-a',
      leftAt: null,
      removedAt: null,
    });
    // Two distinct `message.findFirst` calls happen in the send path and they
'@
$successfulSendReplacement = @'
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
      type: MessagingConversationType.DIRECT,
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue({
      id: 'participant-a',
      userId: 'user-a',
      leftAt: null,
      removedAt: null,
    });
    prisma.conversationParticipant.count.mockResolvedValue(2);
    // Two distinct `message.findFirst` calls happen in the send path and they
'@
$spec = Replace-ExactlyOnce $spec $successfulSendAnchor $successfulSendReplacement 'successful DIRECT send fixture'

$testAnchor = @'
  // ---------------------------------------------------------------- idempotency
'@
$testBlock = @'
  it('blocks new DIRECT messages when fewer than two participants remain active', async () => {
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
      type: MessagingConversationType.DIRECT,
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue({
      id: 'participant-a',
      userId: 'user-a',
      leftAt: null,
      removedAt: null,
    });
    prisma.conversationParticipant.count.mockResolvedValue(1);
    prisma.message.findFirst.mockResolvedValue(null);

    await expect(
      service.createTextMessage(auth, 'conversation-a', 'client-after-leave', 'Nuevo mensaje'),
    ).rejects.toThrow(
      'No se pueden enviar mensajes en una conversacion DIRECT con menos de 2 participantes activos',
    );

    expect(prisma.conversationParticipant.count).toHaveBeenCalledWith({
      where: {
        conversationId: 'conversation-a',
        businessId: 'business-a',
        leftAt: null,
        removedAt: null,
      },
    });
    expect(prisma.message.create).not.toHaveBeenCalled();
  });

  it('keeps a DIRECT conversation and its history readable after one participant leaves', async () => {
    const joinedAt = new Date('2026-10-08T10:00:00.000Z');
    businessContext.resolveForAuthenticatedUser.mockResolvedValueOnce({
      ...context,
      role: 'ASISTENTE_LOCAL',
    });
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-a',
      businessId: 'business-a',
      deletedAt: null,
      type: MessagingConversationType.DIRECT,
    });
    prisma.conversationParticipant.findFirst.mockResolvedValue({
      id: 'remaining-participant',
      userId: 'user-a',
      joinedAt,
      leftAt: null,
      removedAt: null,
    });
    prisma.message.findMany.mockResolvedValue([
      { id: 'historical-message', conversationId: 'conversation-a', content: 'Historial' },
    ]);

    const result = await service.getMessages(auth, 'conversation-a');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('historical-message');
    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          conversationId: 'conversation-a',
          businessId: 'business-a',
          deletedAt: null,
          createdAt: { gte: joinedAt },
        }),
      }),
    );
    expect(prisma.conversation.update).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------- idempotency
'@
$spec = Replace-ExactlyOnce $spec $testAnchor $testBlock 'I-2 regression tests insertion point'

# Only write after every anchor has been validated and transformed successfully.
[System.IO.File]::WriteAllText($servicePath, $service.Replace("`n", $serviceNewline), $utf8NoBom)
[System.IO.File]::WriteAllText($specPath, $spec.Replace("`n", $specNewline), $utf8NoBom)

Write-Host "Patch applied to exactly two files."
Write-Host "Backups: $backupDir"
Write-Host "Next validation commands:"
Write-Host "  Set-Location '$repo\apps\api'"
Write-Host "  npm test -- --runInBand messaging.service.spec.ts"
Write-Host "  npm run build"
Write-Host "  Set-Location '$repo'"
Write-Host "  git diff --check"
