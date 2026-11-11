import type { LinksFunction, MetaFunction } from '@remix-run/node';
import landingStyles from '../styles/landing.css?url';
import { HeroSection } from '~/components/landing/HeroSection';
import { PlatformSection } from '~/components/landing/PlatformSection';
import { FeaturesSection } from '~/components/landing/FeaturesSection';
import { ChannelsSection } from '~/components/landing/ChannelsSection';
import { AutomationSection } from '~/components/landing/AutomationSection';
import { TeamSection } from '~/components/landing/TeamSection';
import { OperationSection } from '~/components/landing/OperationSection';

export const links: LinksFunction = () => [{ rel: 'stylesheet', href: landingStyles }];

export const meta: MetaFunction = () => [
  { title: 'Wapsell · Cada conversación puede ser una venta' },
  {
    name: 'description',
    content:
      'Reúne tus mensajes, acompaña a cada cliente y vende en equipo. Todo desde un mismo lugar, sin perder el hilo.',
  },
];

/** Public landing — Figma "Wapsell · Landing desktop / móvil" (145:12447 / 145:12868). */
export default function LandingPage() {
  return (
    <div className="lp">
      <HeroSection />
      <main>
        <PlatformSection />
        <FeaturesSection />
        <ChannelsSection />
        <AutomationSection />
        <TeamSection />
        <OperationSection />
      </main>
    </div>
  );
}
