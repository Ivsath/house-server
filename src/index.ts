require('dotenv').config();

import { ApolloServer } from 'apollo-server-express';
import cookieParser from 'cookie-parser';
import express, { Application } from 'express';

import { connectDatabase } from './database';
import { resolvers, typeDefs } from './graphql';

const mount = async (app: Application) => {
  try {
    const db = await connectDatabase();

    app.disable('x-powered-by');
    app.use(express.json({ limit: '2mb' }));
    app.use(cookieParser(process.env.SECRET));

    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: ({ req, res }) => ({ db, req, res }),
    });

    server.applyMiddleware({ app, path: '/api' });

    app.listen(process.env.PORT, () => {
      console.log(`[app] : http://localhost:${process.env.PORT}`);
    });
  } catch (err) {
    console.error(err);
  }
};

mount(express());
