export interface Material {
    id: string;
    name: string;
    category: string;
    price: string;
    unit: string;
    image: string;
    description: string;
    vendor: string;
    rating: number;
    tags: string[];
    co2Footprint?: string;
    availability: 'In Stock' | 'Low Stock' | 'Out of Stock';
}

export const materials: Material[] = [
    {
        id: 'm1',
        name: "Portland Cement (Dangote)",
        category: "Cement & Aggregates",
        price: "12500",
        unit: "50kg Bag",
        image: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80",
        description: "Multi-purpose 42.5N grade cement for all construction stages.",
        vendor: "Dangote Group",
        rating: 4.8,
        tags: ["High Strength", "Tropical Formula"],
        availability: "In Stock"
    },
    {
        id: 'm2',
        name: "Quarry Granite (3/4 inch)",
        category: "Cement & Aggregates",
        price: "15000",
        unit: "Ton",
        image: "https://images.unsplash.com/photo-1590060419630-f56f34582f3a?auto=format&fit=crop&w=800&q=80",
        description: "Washed basalt granite for high-quality concrete production.",
        vendor: "Lafarge Quarries",
        rating: 4.5,
        tags: ["Structural", "Crushed"],
        availability: "In Stock"
    },
    {
        id: 'm3',
        name: "Reinforcement Steel (16mm)",
        category: "Steel & Iron",
        price: "650000",
        unit: "Ton",
        image: "https://images.unsplash.com/photo-1516156008625-3a9d6067fb52?auto=format&fit=crop&w=800&q=80",
        description: "High-yield TMT bars for structural columns and beams.",
        vendor: "Universal Steel",
        rating: 4.7,
        tags: ["TMT", "FE500"],
        availability: "In Stock"
    },
    {
        id: 'm4',
        name: "Longspan Aluminum Roofing (0.55mm)",
        category: "Roofing",
        price: "4500",
        unit: "sqm",
        image: "https://images.unsplash.com/photo-1635424710928-0544e8512eae?auto=format&fit=crop&w=800&q=80",
        description: "Premium gauge aluminum with heat-reflective coating.",
        vendor: "Alu-Prime Systems",
        rating: 4.9,
        tags: ["Corrosion Resistant", "Premium Gauge"],
        availability: "Low Stock"
    },
    {
        id: 'm5',
        name: "Eco-Logic Compressed Earth Bricks",
        category: "Blocks & Bricks",
        price: "350",
        unit: "Unit",
        image: "https://images.unsplash.com/photo-1604187351574-c75ca79f5807?auto=format&fit=crop&w=800&q=80",
        description: "High-density interlocking earth blocks with zero carbon footprint.",
        vendor: "GreenBuild Nig",
        rating: 4.6,
        tags: ["Sustainable", "Fireproof"],
        co2Footprint: "-5.2kg/unit",
        availability: "In Stock"
    },
    {
        id: 'm6',
        name: "Polished Vitrified Tile (600x600)",
        category: "Finishing & Decor",
        price: "7200",
        unit: "sqm",
        image: "https://images.unsplash.com/photo-1516455590571-18256e5bb9ff?auto=format&fit=crop&w=800&q=80",
        description: "Nano-polished tiles for high-traffic interior floors.",
        vendor: "Royal Ceramics",
        rating: 4.4,
        tags: ["Stain Resistant", "Modern"],
        availability: "In Stock"
    }
];
