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
        image: "/images/materials/cement.png",
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
        image: "/images/materials/granite.png",
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
        image: "/images/materials/steel.png",
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
        image: "/images/materials/tiles.png",
        description: "Nano-polished tiles for high-traffic interior floors.",
        vendor: "Royal Ceramics",
        rating: 4.4,
        tags: ["Stain Resistant", "Modern"],
        availability: "In Stock"
    },
    {
        id: 'm7',
        name: "1\" Granite (30 Tonnes)",
        category: "Sand & Gravel",
        price: "603750",
        unit: "30 Tonnes",
        image: "/images/materials/granite.png",
        description: "Bulk 1-inch granite aggregate for heavy structural drainage and foundation base.",
        vendor: "Atanda Granites & Stones Enterprises",
        rating: 4.8,
        tags: ["Bulk", "Foundation"],
        availability: "In Stock"
    },
    {
        id: 'm8',
        name: "3/4\" Granite (30 Tonnes)",
        category: "Sand & Gravel",
        price: "603750",
        unit: "30 Tonnes",
        image: "/Users/EduPc/.gemini/antigravity/brain/ee9190c1-bf8c-479b-bcef-09ff149e907f/construction_granite_aggregate_1771937049971.png",
        description: "Standard 3/4-inch crushed granite for concrete slab and column production.",
        vendor: "Atanda Granites & Stones Enterprises",
        rating: 4.9,
        tags: ["Structural", "Washed"],
        availability: "In Stock"
    },
    {
        id: 'm9',
        name: "Sharp River Sand (30 Tonnes)",
        category: "Sand & Gravel",
        price: "450000",
        unit: "30 Tonnes",
        image: "/images/materials/sand.png",
        description: "Clean, sharp river sand for high-strength concrete and plastering works.",
        vendor: "Atanda Granites & Stones Enterprises",
        rating: 4.7,
        tags: ["Clean", "Sharp"],
        availability: "In Stock"
    }
];
