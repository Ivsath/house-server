require('dotenv').config();

import { ApolloServer } from 'apollo-server-express';
import express, { Application } from 'express';

import { connectDatabase } from './database';
import { resolvers, typeDefs } from './graphql';

const mount = async (app: Application) => {
  try {
    const db = await connectDatabase();
    const server = new ApolloServer({
      typeDefs,
      resolvers,
      context: () => ({ db }),
    });

    app.disable('x-powered-by');

    server.applyMiddleware({ app, path: '/api' });

    app.listen(process.env.PORT, () => {
      console.log(`[app] : http://localhost:${process.env.PORT}`);
    });
  } catch (err) {
    console.error(err);
  }
};

mount(express());
