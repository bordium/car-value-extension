type DataEntry = {
    make: string;
    model: string;
    url: string;
    trim?: string;
    year: number;
    price: number;
    imageUrl: string | null;
    mileage: number | null;
    location: string | null; // optional, in case the location is not available
    title: string;
    source: 'facebook' | 'craigslist' | null;
};

export type { DataEntry };