import * as homeContent from '../content/home.js';


export function renderHome(_req, res) {
  res.render('home', { ...homeContent });
}

export function renderApp(_req, res) {
  res.render('app');
}
