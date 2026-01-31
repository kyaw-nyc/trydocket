declare module 'luxon' {
  export interface Zone {
    isValid: boolean;
    name: string;
  }

  export class DateTime {
    static fromISO(text: string, opts?: { zone?: string; setZone?: boolean }): DateTime;
    static now(): DateTime;
    static local(year?: number, month?: number, day?: number, hour?: number, minute?: number, second?: number, millisecond?: number): DateTime;

    get year(): number;
    get month(): number;
    get day(): number;
    get hour(): number;
    get minute(): number;
    get second(): number;
    get millisecond(): number;
    get weekday(): number;
    get zoneName(): string;
    get zone(): Zone;

    isValid: boolean;
    invalidReason: string | null;

    toISO(opts?: { suppressMilliseconds?: boolean }): string | null;
    toFormat(fmt: string): string;
    toJSDate(): Date;

    plus(duration: { years?: number; months?: number; weeks?: number; days?: number; hours?: number; minutes?: number; seconds?: number; milliseconds?: number }): DateTime;
    minus(duration: { years?: number; months?: number; weeks?: number; days?: number; hours?: number; minutes?: number; seconds?: number; milliseconds?: number }): DateTime;

    set(values: { year?: number; month?: number; day?: number; hour?: number; minute?: number; second?: number; millisecond?: number }): DateTime;

    setZone(zone: string, opts?: { keepLocalTime?: boolean }): DateTime;

    startOf(unit: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second'): DateTime;
    endOf(unit: 'year' | 'month' | 'week' | 'day' | 'hour' | 'minute' | 'second'): DateTime;

    diff(other: DateTime, unit?: string | string[]): Duration;

    equals(other: DateTime): boolean;

    valueOf(): number;
  }

  export class Duration {
    as(unit: string): number;
    toObject(): { years?: number; months?: number; weeks?: number; days?: number; hours?: number; minutes?: number; seconds?: number; milliseconds?: number };
  }
}
