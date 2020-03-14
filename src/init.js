import './scss/index.scss';
import _ from 'lodash';
import { string } from 'yup';
import axios from 'axios';
import i18next from 'i18next';
import render from './view';

const validate = (state) => {
  const errorMessages = {
    repeated: i18next.t('form.errors.repeated'),
    valid: i18next.t('form.errors.valid'),
  };
  const errors = {};
  const { link } = state.form;
  const { feedList } = state.output;
  if (_.find(feedList, { feedLink: link })) {
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
  validate(state).then((errors) => {
    state.form.errors = errors;  // eslint-disable-line
    state.form.valid = _.isEqual(errors, {}); // eslint-disable-line
  });
};

const parseXML = (xml) => {
  const result = { feed: {}, news: [] };
  const domparser = new DOMParser();
  const doc = domparser.parseFromString(xml.data, 'text/xml');
  const channelEl = doc.querySelector('channel');
  const feedTitle = channelEl.querySelector('title').textContent;
  const feedDescription = channelEl.querySelector('description').textContent;
  result.feed = { feedTitle, feedDescription };
  const items = channelEl.getElementsByTagName('item');
  [...items].forEach((item) => {
    const newsTitle = item.querySelector('title').textContent;
    const newsLink = item.querySelector('link').textContent;
    result.news.push({
      newsTitle, newsLink,
    });
  });
  return result;
};

const getRSS = (link, state) => {
  axios.get(`https://cors-anywhere.herokuapp.com/${link}`)
    .then((rss) => {
      const data = parseXML(rss);
      data.feed.feedLink = link;
      const feedId = _.uniqueId();
      data.feed.feedId = feedId;

      data.news.forEach((newsObj) => {
        const newsId = _.uniqueId();
        newsObj.newsId = newsId; // eslint-disable-line
        newsObj.feedId = feedId; // eslint-disable-line
        state.output.newsList.push(newsObj);
      });

      state.output.activeFeedId = feedId; // eslint-disable-line
      state.output.feedList.push(data.feed);
      state.form.processState = 'filling'; // eslint-disable-line
    });
};

const updateNews = (state) => {
  state.output.feedList.forEach((feedObj) => {
    axios.get(`https://cors-anywhere.herokuapp.com/${feedObj.feedLink}`)
      .then((rss) => {
        const data = parseXML(rss);
        const newNews = _.differenceBy(data.news, state.output.newsList, 'newsLink');
        newNews.forEach((newsObj) => {
          const newsId = _.uniqueId();
          newsObj.newsId = newsId; // eslint-disable-line
          newsObj.feedId = feedObj.feedId; // eslint-disable-line
          state.output.newsList.unshift(newsObj);
        });
        const { activeFeedId } = state.output; // костыль для вызова перерисовки ^-^
        state.output.activeFeedId = 0; // eslint-disable-line
        state.output.activeFeedId = activeFeedId; // eslint-disable-line
      });
  });
  setTimeout(() => updateNews(state), 5000);
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
      feedList: [],
      newsList: [],
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
    getRSS(link, state);
  });

  render(state);
  updateNews(state);
};
