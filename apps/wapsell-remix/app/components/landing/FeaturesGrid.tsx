export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export interface FeaturesGridProps {
  title: string;
  features: Feature[];
}

export function FeaturesGrid({ title, features }: FeaturesGridProps) {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-gray-900 text-center mb-16">
          {title}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, idx) => (
            <div
              key={idx}
              className="p-8 bg-gray-50 rounded-xl hover:shadow-lg transition-shadow hover:bg-blue-50"
            >
              <div className="text-5xl mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed text-sm">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
