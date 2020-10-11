import { Repository } from 'typeorm';

import { BookingEntity, ListingEntity, UserEntity } from '../database/entity';

export interface Viewer {
  id?: string;
  token?: string;
  avatar?: string;
  walletId?: string | null;
  didRequest: boolean;
}

export enum ListingType {
  Apartment = 'APARTMENT',
  House = 'HOUSE',
}

export interface BookingsIndexMonth {
  [key: string]: boolean;
}

export interface BookingsIndexYear {
  [key: string]: BookingsIndexMonth;
}

export interface BookingsIndex {
  [key: string]: BookingsIndexYear;
}

export interface Booking {
  id: string;
  listing: string;
  tenant: string;
  checkIn: string;
  checkOut: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  image: string;
  host: string;
  type: ListingType;
  address: string;
  country: string;
  admin: string;
  city: string;
  bookings: string[];
  bookingsIndex: BookingsIndex;
  price: number;
  numOfGuests: number;
  authorized?: boolean;
}

export interface User {
  id: string;
  token: string;
  name: string;
  avatar: string;
  contact: string;
  walletId?: string | null;
  income: number;
  bookings: string[];
  listings: string[];
  authorized?: boolean;
}

export interface Database {
  bookings: Repository<BookingEntity>;
  listings: Repository<ListingEntity>;
  users: Repository<UserEntity>;
}
