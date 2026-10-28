import type { MetaFunction } from "@remix-run/node";

export const meta: MetaFunction = () => {
  return [
    { title: "Wapsell Remix" },
    { name: "description", content: "Welcome to Wapsell Remix!" },
  ];
};

export default function Index() {
  return (
    <div className="flex items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">Welcome to Wapsell Remix</h1>
    </div>
  );
}
