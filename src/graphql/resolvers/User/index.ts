import { IResolvers } from 'apollo-server-express';
import { Request } from 'express';

import { Database, User } from '../../../lib/types';
import { authorize } from '../../../lib/utils';
import {
  UserArgs,
  UserBookingsArgs,
  UserBookingsData,
  UserListingsArgs,
  UserListingsData,
} from './types';

export const userResolvers: IResolvers = {
  Query: {
    user: async (
      _root: undefined,
      { id }: UserArgs,
      { db, req }: { db: Database; req: Request },
    ): Promise<User> => {
      try {
        // Cast to User so we can add the authorize property later on
        const user = (await db.users.findOne({ id })) as User;

        if (!user) {
          throw new Error("User can't be found!");
        }

        const viewer = await authorize(db, req);
        if (viewer && viewer.id === user.id) {
          user.authorized = true;
        }

        return user;
      } catch (error) {
        throw new Error(`Failed to query user: ${error}`);
      }
    },
  },
  User: {
    hasWallet: (user: User): boolean => {
      return Boolean(user.walletId);
    },
    income: (user: User): number | null => {
      return user.authorized ? user.income : null;
    },
    bookings: async (
      user: User,
      { limit, page }: UserBookingsArgs,
      { db }: { db: Database },
    ): Promise<UserBookingsData | null> => {
      try {
        if (!user.authorized) {
          return null;
        }

        const data: UserBookingsData = {
          total: 0,
          result: [],
        };

        const bookings = await db.bookings.findByIds(user.bookings, {
          skip: page > 0 ? (page - 1) * limit : 0,
          take: limit,
        });

        data.total = user.bookings.length;
        data.result = bookings;

        return data;
      } catch (error) {
        throw new Error(`Failed to query user bookings: ${error}`);
      }
    },
    listings: async (
      user: User,
      { limit, page }: UserListingsArgs,
      { db }: { db: Database },
    ): Promise<UserListingsData | null> => {
      try {
        const data: UserListingsData = {
          total: 0,
          result: [],
        };

        const listings = await db.listings.findByIds(user.listings, {
          skip: page > 0 ? (page - 1) * limit : 0,
          take: limit,
        });

        data.total = user.listings.length;
        data.result = listings;

        return data;
      } catch (error) {
        throw new Error(`Failed to query user listings: ${error}`);
      }
    },
  },
};
