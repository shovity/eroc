export declare const phoneU: {
    refine: (phone: string) => string
}

export declare const placeU: {
    refine: (place: string) => string
}

export declare const stringU: {
    removeViAccent: (content: string) => string
    separate: (value: string, sign: string = ',') => string
}

export declare const timeU: {
    timef: (utctime: Date | string | number, offset?: number) => string
}