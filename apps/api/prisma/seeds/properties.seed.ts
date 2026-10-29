import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedProperties() {
  console.log('Seeding demo properties...');

  // Clear existing properties (optional)
  // await prisma.property.deleteMany({});

  const properties = [
    {
      id: 'prop-buenos-aires-apt-001',
      title: 'Modern Apartment in San Telmo',
      description:
        'Beautifully renovated 2-bedroom apartment in the historic San Telmo neighborhood. Features modern amenities, high ceilings, and street-facing balcony.',
      type: 'apartment',
      price: 250000,
      bedrooms: 2,
      bathrooms: 1,
      location: 'San Telmo, Buenos Aires',
      address: 'Avenida Defensa 1456, Buenos Aires, Argentina',
      latitude: -34.6315,
      longitude: -58.3665,
      images: [
        'https://images.unsplash.com/photo-1493857671505-72967e2e2760',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
      ],
      amenities: ['WiFi', 'Air Conditioning', 'Heating', 'Balcony'],
      metadata: {
        yearBuilt: 1980,
        renovated: 2024,
        squareMeters: 85,
      },
    },
    {
      id: 'prop-buenos-aires-house-002',
      title: 'Spacious Family House in Recoleta',
      description:
        'Large 4-bedroom house in exclusive Recoleta neighborhood. Perfect for families, features garden, garage for 3 cars, and modern kitchen.',
      type: 'house',
      price: 500000,
      bedrooms: 4,
      bathrooms: 2,
      location: 'Recoleta, Buenos Aires',
      address: 'Calle Libertad 845, Buenos Aires, Argentina',
      latitude: -34.5956,
      longitude: -58.3889,
      images: [
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6',
        'https://images.unsplash.com/photo-1570129477492-45ba003d3381',
      ],
      amenities: [
        'Garden',
        'Garage',
        'Pool',
        'Security System',
        'BBQ Area',
      ],
      metadata: {
        yearBuilt: 2000,
        squareMeters: 280,
        stories: 2,
      },
    },
    {
      id: 'prop-buenos-aires-apt-003',
      title: 'Luxury Penthouse with City Views',
      description:
        'Stunning 3-bedroom penthouse in Palermo Soho with panoramic views of the city. High-end finishes, private rooftop terrace, and modern smart home features.',
      type: 'apartment',
      price: 750000,
      bedrooms: 3,
      bathrooms: 2,
      location: 'Palermo Soho, Buenos Aires',
      address: 'Avenida Santa Fe 2500, Buenos Aires, Argentina',
      latitude: -34.5954,
      longitude: -58.4153,
      images: [
        'https://images.unsplash.com/photo-1512917774080-9b274c5149c3',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688',
      ],
      amenities: [
        'Rooftop Terrace',
        'Smart Home',
        'Wine Cellar',
        'Concierge',
      ],
      metadata: {
        yearBuilt: 2020,
        squareMeters: 180,
        floor: 15,
      },
    },
    {
      id: 'prop-buenos-aires-land-004',
      title: 'Prime Development Land in Vicente López',
      description:
        'Large plot of land (1000 sqm) in rapidly developing Vicente López. Perfect for development project or building your dream home. Close to metro station.',
      type: 'land',
      price: 300000,
      bedrooms: 0,
      bathrooms: 0,
      location: 'Vicente López, Greater Buenos Aires',
      address: 'Calle 9 de Julio 500, Vicente López, Argentina',
      latitude: -34.4928,
      longitude: -58.4793,
      images: [
        'https://images.unsplash.com/photo-1500382017468-7049fad278fa',
      ],
      amenities: ['Close to Metro', 'Commercial Zone', 'Services Nearby'],
      metadata: {
        squareMeters: 1000,
        zoning: 'Development',
      },
    },
    {
      id: 'prop-buenos-aires-commercial-005',
      title: 'Retail Space in Puerto Madero',
      description:
        'Modern commercial space in prestigious Puerto Madero development. Ideal for showroom, office, or retail shop. High foot traffic area.',
      type: 'commercial',
      price: 400000,
      bedrooms: 0,
      bathrooms: 1,
      location: 'Puerto Madero, Buenos Aires',
      address: 'Dique 2, Puerto Madero, Buenos Aires, Argentina',
      latitude: -34.6038,
      longitude: -58.3614,
      images: [
        'https://images.unsplash.com/photo-1497366216548-37526070297c',
      ],
      amenities: ['Reception Area', 'Parking', 'Climate Control', 'Security'],
      metadata: {
        squareMeters: 150,
        floors: 1,
        parking: true,
      },
    },
    {
      id: 'prop-buenos-aires-apt-006',
      title: 'Cozy Studio in La Boca',
      description:
        'Charming studio apartment in bohemian La Boca neighborhood. Recently renovated with open concept kitchen and living area. Great location near restaurants and galleries.',
      type: 'apartment',
      price: 180000,
      bedrooms: 1,
      bathrooms: 1,
      location: 'La Boca, Buenos Aires',
      address: 'Caminito 320, Buenos Aires, Argentina',
      latitude: -34.6412,
      longitude: -58.3623,
      images: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267',
      ],
      amenities: ['Open Kitchen', 'Air Conditioning', 'WiFi Ready'],
      metadata: {
        yearBuilt: 1990,
        renovated: 2023,
        squareMeters: 45,
      },
    },
  ];

  for (const property of properties) {
    const existing = await prisma.property.findUnique({
      where: { id: property.id },
    });

    if (!existing) {
      await prisma.property.create({
        data: property,
      });
      console.log(`✓ Created property: ${property.title}`);
    } else {
      console.log(`✓ Property already exists: ${property.title}`);
    }
  }

  console.log('✓ Properties seeding completed!');
}

seedProperties()
  .catch((error) => {
    console.error('Error seeding properties:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
