type dataEntry = {
    make: string;
    model: string;
    url: string;
    trim?: string;
    year: number;
    price: number;
    mileage?: number;
    imageUrl?: string; // optional, in case the image is not available
    source: 'facebook' | 'craigslist' | null;
};

export type { dataEntry };