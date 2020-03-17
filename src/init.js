/* eslint no-param-reassign: "error" */
import './scss/index.scss';
import _ from 'lodash';
import { string } from 'yup';
import axios from 'axios';
import i18next from 'i18next';
import view from './view';

const validate = (link, feeds) => {
  const errorMessages = {
    repeated: i18next.t('form.errors.repeated'),
    valid: i18next.t('form.errors.valid'),
  };
  const errors = {};
  if (_.find(feeds, { feedLink: link })) {
    errors.link = errorMessages.repeated;
    const promise = Promise.resolve();
    return promise.then(() => errors);
  }
  const schema = string().url();
  return schema
    .isValid(link)
    .then((valid) => {
      if (!valid) {
        errors.link = errorMessages.valid;
      }
      return errors;
    });
};

const updateValidationState = (state) => {
  const { link } = state.form;
  const { feeds } = state.output;
  validate(link, feeds).then((errors) => {
    state.form.errors = errors;
    state.form.valid = _.isEqual(errors, {});
  });
};

const parseXML = (xml) => {
  const result = { feed: {}, posts: [] };
  const domparser = new DOMParser();
  const doc = domparser.parseFromString(xml, 'text/xml');
  const channelEl = doc.querySelector('channel');
  const feedTitle = channelEl.querySelector('title').textContent;
  const feedDescription = channelEl.querySelector('description').textContent;
  result.feed = { feedTitle, feedDescription };
  const items = channelEl.getElementsByTagName('item');
  [...items].forEach((item) => {
    const postTitle = item.querySelector('title').textContent;
    const postLink = item.querySelector('link').textContent;
    result.posts.push({
      postTitle, postLink,
    });
  });
  return result;
};

const getProxyPath = link => (`https://cors-anywhere.herokuapp.com/${link}`);

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
        state.output.posts.push(postObj);
      });

      state.output.activeFeedId = feedId;
      state.output.feeds.push(data.feed);
      state.form.processState = 'filling';
    });
};

const getNewPosts = (state) => {
  state.output.feeds.forEach((feedObj) => {
    const proxyPath = getProxyPath(feedObj.feedLink);
    axios.get(proxyPath)
      .then((rss) => {
        const data = parseXML(rss.data);
        const newPosts = _.differenceBy(data.posts, state.output.posts, 'postLink');
        newPosts.forEach((postObj) => {
          const postId = _.uniqueId();
          postObj.postId = postId;
          postObj.feedId = feedObj.feedId;
          state.output.posts.unshift(postObj);
        });
        const { activeFeedId } = state.output; // костыль для вызова перерисовки ^-^
        state.output.activeFeedId = 0;
        state.output.activeFeedId = activeFeedId;
      });
  });
  setTimeout(() => getNewPosts(state), 5000);
};

export default () => {
  const state = {
    form: {
      processState: 'filling',
      link: '',
      valid: false,
      errors: {},
    },
    output: {
      activeFeedId: null,
      feeds: [],
      posts: [],
    },
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

  view(state);
  getNewPosts(state);
};
