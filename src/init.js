/* eslint no-param-reassign: "error" */
import './scss/index.scss';
import _ from 'lodash';
import { string } from 'yup';
import axios from 'axios';
import i18next from 'i18next';
import updateView from './view';

const validate = (link, feeds) => {
  const errorMessages = {
    repeated: i18next.t('form.errors.repeated'),
    valid: i18next.t('form.errors.valid'),
  };
  const errors = {};
  if (_.find(feeds, { feedLink: link })) {
    errors.link = errorMessages.repeated;
  }
  const schema = string().url();
  const valid = schema.isValidSync(link);
  if (!valid) {
    errors.link = errorMessages.valid;
  }
  return errors;
};

const updateValidationState = (state) => {
  const { link } = state.form;
  const { feeds } = state;
  const errors = validate(link, feeds);
  state.form.errors = errors;
  state.form.valid = _.isEqual(errors, {});
};

const parseXML = (rssXml) => {
  const result = { feed: {}, posts: [] };
  const domparser = new DOMParser();
  const doc = domparser.parseFromString(rssXml, 'text/xml');
  const channelEl = doc.querySelector('channel');
  const feedTitle = channelEl.querySelector('title').textContent;
  const feedDescription = channelEl.querySelector('description').textContent;
  result.feed = { feedTitle, feedDescription };
  const items = channelEl.getElementsByTagName('item');
  result.posts = [...items].map((item) => {
    const postTitle = item.querySelector('title').textContent;
    const postLink = item.querySelector('link').textContent;
    return { postTitle, postLink };
  });
  return result;
};

const getProxyPath = (link) => (`https://cors-anywhere.herokuapp.com/${link}`); // eslint-disable-line

const addRSS = (link, state) => {
  const proxyPath = getProxyPath(link);
  axios.get(proxyPath)
    .then((rss) => {
      const data = parseXML(rss.data);
      data.feed.feedLink = link;
      const feedId = _.uniqueId();
      data.feed.feedId = feedId;

      data.posts.forEach((postObj) => {
        const postId = _.uniqueId();
        postObj.postId = postId;
        postObj.feedId = feedId;
        state.posts.push(postObj);
      });

      state.activeFeedId = feedId;
      state.feeds.push(data.feed);
      state.form.processState = 'filling';
    });
};

const runAutoUpdate = (state) => {
  state.feeds.forEach((feedObj) => {
    const proxyPath = getProxyPath(feedObj.feedLink);
    axios.get(proxyPath)
      .then((rss) => {
        const data = parseXML(rss.data);
        const newPosts = _.differenceBy(data.posts, state.posts, 'postLink');
        newPosts.forEach((postObj) => {
          const postId = _.uniqueId();
          postObj.postId = postId;
          postObj.feedId = feedObj.feedId;
          state.posts.unshift(postObj);
        });
        const { activeFeedId } = state; // костыль для вызова перерисовки ^-^
        state.activeFeedId = 0;
        state.activeFeedId = activeFeedId;
      });
  });
  setTimeout(() => runAutoUpdate(state), 5000);
};

export default () => {
  const state = {
    form: {
      processState: 'filling',
      link: '',
      valid: false,
      errors: {},
    },
    activeFeedId: null,
    feeds: [],
    posts: [],
  };

  const inputElement = document.getElementById('link');
  const form = document.querySelector('[data-form="add-feed"]');

  inputElement.addEventListener('input', ({ target }) => {
    state.form.link = target.value;
    updateValidationState(state);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    state.form.processState = 'processing';
    const { link } = state.form;
    addRSS(link, state);
  });

  updateView(state);
  runAutoUpdate(state);
};
