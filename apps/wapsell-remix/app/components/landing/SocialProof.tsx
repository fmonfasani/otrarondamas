export interface SocialProofProps {
  title: string;
  companies?: string[];
  stats?: Array<{
    label: string;
    value: string;
  }>;
}

export function SocialProof({ title, companies, stats }: SocialProofProps) {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white border-y border-gray-200">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-12">
          {title}
        </h2>

        {stats && stats.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {stat.value}
                </div>
                <p className="text-gray-600">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {companies && companies.length > 0 && (
          <div className="flex flex-wrap justify-center items-center gap-8">
            {companies.map((company, idx) => (
              <div
                key={idx}
                className="px-6 py-3 bg-gray-100 rounded-lg text-gray-700 font-medium"
              >
                {company}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
