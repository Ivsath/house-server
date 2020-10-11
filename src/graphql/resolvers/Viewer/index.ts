import { IResolvers } from 'apollo-server-express';
import crypto from 'crypto';
import { Request, Response } from 'express';

import { Google, Stripe } from '../../../lib/api';
import { Database, User, Viewer } from '../../../lib/types';
import { authorize } from '../../../lib/utils';
import { ConnectStripeArgs, LogInArgs } from './types';

const cookieOptions = {
  httpOnly: true,
  sameSite: true,
  signed: true,
  secure: process.env.NODE_ENV === 'development' ? false : true,
};

const logInViaGoogle = async (
  code: string,
  token: string,
  db: Database,
  res: Response,
): Promise<User | undefined> => {
  const { user } = await Google.logIn(code);

  if (!user) {
    throw new Error('Google login error');
  }

  // Name/Photo/Email Lists
  const userNamesList = user.names && user.names.length ? user.names : null;
  const userPhotosList = user.photos && user.photos.length ? user.photos : null;
  const userEmailsList =
    user.emailAddresses && user.emailAddresses.length
      ? user.emailAddresses
      : null;

  // User Display Name
  const userName = userNamesList ? userNamesList[0].displayName : null;

  // User Id
  const userId =
    userNamesList &&
    userNamesList[0].metadata &&
    userNamesList[0].metadata.source
      ? userNamesList[0].metadata.source.id
      : null;

  // User Avatar
  const userAvatar =
    userPhotosList && userPhotosList[0].url ? userPhotosList[0].url : null;

  // User Email
  const userEmail =
    userEmailsList && userEmailsList[0].value ? userEmailsList[0].value : null;

  if (!userName || !userId || !userAvatar || !userEmail) {
    throw new Error('Google login error');
  }

  let viewer = await db.users.findOne({ id: userId });

  if (viewer) {
    viewer.name = userName;
    viewer.avatar = userAvatar;
    viewer.contact = userEmail;
    viewer.token = token;

    await viewer.save();
  } else {
    const newUser: User = {
      id: userId,
      token,
      name: userName,
      avatar: userAvatar,
      contact: userEmail,
      income: 0,
      bookings: [],
      listings: [],
    };

    viewer = await db.users.create(newUser).save();
  }

  res.cookie('viewer', userId, {
    ...cookieOptions,
    maxAge: 365 * 24 * 60 * 60 * 1000,
  });

  return viewer;
};

const logInViaCookie = async (
  token: string,
  db: Database,
  req: Request,
  res: Response,
): Promise<User | undefined> => {
  const viewer = await db.users.findOne({ id: req.signedCookies.viewer });

  if (viewer) {
    viewer.token = token;
    await viewer.save();
  } else {
    res.clearCookie('viewer', cookieOptions);
  }

  return viewer;
};

export const viewerResolvers: IResolvers = {
  Query: {
    authUrl: () => {
      try {
        return Google.authUrl;
      } catch (err) {
        throw new Error('Failed to query Google Auth Url: ${error}');
      }
    },
  },
  Mutation: {
    logIn: async (
      _root: undefined,
      { input }: LogInArgs,
      { db, req, res }: { db: Database; req: Request; res: Response },
    ): Promise<Viewer> => {
      try {
        const code = input ? input.code : null;
        const token = crypto.randomBytes(16).toString('hex');

        const viewer: User | undefined = code
          ? await logInViaGoogle(code, token, db, res)
          : await logInViaCookie(token, db, req, res);

        if (!viewer) {
          return { didRequest: true };
        }

        return {
          id: viewer.id,
          token: viewer.token,
          avatar: viewer.avatar,
          walletId: viewer.walletId,
          didRequest: true,
        };
      } catch (err) {
        throw new Error(`Failed to log in: ${err}`);
      }
    },
    logOut: (
      _root: undefined,
      _args: {},
      { res }: { res: Response },
    ): Viewer => {
      try {
        res.clearCookie('viewer', cookieOptions);
        return { didRequest: true };
      } catch (err) {
        throw new Error(`Failed to log out: ${err}`);
      }
    },
    connectStripe: async (
      _root: undefined,
      { input }: ConnectStripeArgs,
      { db, req }: { db: Database; req: Request },
    ): Promise<Viewer> => {
      try {
        const { code } = input;

        const viewer = await authorize(db, req);
        if (!viewer) {
          throw new Error('Viewer could not be found');
        }

        const wallet = await Stripe.connect(code);
        if (!wallet) {
          throw new Error('Stripe grant error');
        }

        viewer.walletId = wallet.stripe_user_id;
        await viewer.save();

        return {
          id: viewer.id,
          token: viewer.token,
          avatar: viewer.avatar,
          walletId: viewer.walletId,
          didRequest: true,
        };
      } catch (error) {
        throw new Error(`Failed to connect with Stripe: ${error}`);
      }
    },
    disconnectStripe: async (
      _root: undefined,
      _args: {},
      { db, req }: { db: Database; req: Request },
    ): Promise<Viewer> => {
      try {
        const viewer = await authorize(db, req);
        if (!viewer || !viewer.walletId) {
          throw new Error(
            'Viewer could not be found or has not connected with Stripe',
          );
        }

        const wallet = await Stripe.disconnect(viewer.walletId);
        if (!wallet) {
          throw new Error('Stripe disconnect error');
        }

        viewer.walletId = null;
        await viewer.save();

        return {
          id: viewer.id,
          token: viewer.token,
          avatar: viewer.avatar,
          walletId: viewer.walletId,
          didRequest: true,
        };
      } catch (error) {
        throw new Error(`Failed to disconnect with Stripe: ${error}`);
      }
    },
  },
  Viewer: {
    hasWallet: (viewer: Viewer): boolean | undefined => {
      return viewer.walletId ? true : undefined;
    },
  },
};
