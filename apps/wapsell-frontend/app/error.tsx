'use client';

export default function Error() {
  return (
    <html lang="en">
      <body>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <h1>500 - Server Error</h1>
            <p>Something went wrong on our end.</p>
          </div>
        </div>
      </body>
    </html>
  );
}
