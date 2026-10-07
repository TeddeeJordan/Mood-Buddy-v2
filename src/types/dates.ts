/** A calendar date in `YYYY-MM-DD` form. Branded so a raw string can't be passed by accident. */
export type LocalDateKey = string & { readonly __brand: 'LocalDateKey' };
