import { GatsbyBrowser } from 'gatsby';
import { StrictMode } from 'react';
import { App } from './src/App';
import { Root } from './src/Root';

export const wrapRootElement: GatsbyBrowser['wrapRootElement'] = ({
  element,
}) => (
    <Root>{element}</Root>
);

export const wrapPageElement: GatsbyBrowser['wrapPageElement'] = ({
  element,
}) => <App>{element}</App>;
