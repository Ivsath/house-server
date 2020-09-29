import { IResolvers } from 'apollo-server-express';
import { Request } from 'express';
import { ObjectId } from 'mongodb';

import { Database, Listing, User } from '../../../lib/types';
import { authorize } from '../../../lib/utils';
import { ListingArgs } from './types';

export const listingResolvers: IResolvers = {
  Query: {
    listing: async (
      _root: undefined,
      { id }: ListingArgs,
      { db, req }: { db: Database; req: Request },
    ): Promise<Listing> => {
      try {
        const listing = await db.listings.findOne({ _id: new ObjectId(id) });
        if (!listing) {
          throw new Error("listing can't be found");
        }

        const viewer = await authorize(db, req);
        if (viewer && viewer._id === listing.host) {
          listing.authorized = true;
        }

        return listing;
      } catch (error) {
        throw new Error(`Failed to query listing: ${error}`);
      }
    },
  },
  Listing: {
    id: (listing: Listing): string => {
      return listing._id.toString();
    },
    host: async (
      listing: Listing,
      _args: {},
      { db }: { db: Database },
    ): Promise<User> => {
      const host = await db.users.findOne({ _id: listing.host });
      if (!host) {
        throw new Error("Host can't be found");
      }
      return host;
    },
  },
};
