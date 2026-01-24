/**
 * @fileoverview React Component - Generic mobile card list container
 * 
 * @author Abhishek Chandra <abhishek.chandra@csir.res.in>
 * @company Council of Scientific and Industrial Research, India
 * @license CSIR
 * @version 1.0.0
 * @since 2026-01-25
 */

import React from 'react';

interface MobileCardListProps<T> {
    data: T[];
    renderItem: (item: T) => React.ReactNode;
    keyExtractor: (item: T) => string | number;
    emptyMessage?: string;
}

export function MobileCardList<T>({
    data,
    renderItem,
    keyExtractor,
    emptyMessage = "No items found."
}: MobileCardListProps<T>) {

    if (!data || data.length === 0) {
        return (
            <div className="md:hidden p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-100">
                {emptyMessage}
            </div>
        );
    }

    return (
        <div className="md:hidden space-y-4">
            {data.map((item) => (
                <div key={keyExtractor(item)}>
                    {renderItem(item)}
                </div>
            ))}
        </div>
    );
}
