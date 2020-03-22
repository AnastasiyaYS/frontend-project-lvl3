import { watch } from 'melanke-watchjs';
import _ from 'lodash';
import i18next from 'i18next';

export default (state) => {
  const inputElement = document.getElementById('link');
  const form = document.querySelector('[data-form="add-feed"]');
  const submitButton = form.querySelector('input[type="submit"]');

  inputElement.placeholder = i18next.t('form.placeholder');
  submitButton.value = i18next.t('form.button');
  const titleEl = document.querySelector('title');
  titleEl.textContent = i18next.t('title');
  const feedsTitleEl = document.getElementById('feedsTitle');
  feedsTitleEl.textContent = i18next.t('feedsTitle');
  const postsTitleEl = document.getElementById('postsTitle');
  postsTitleEl.textContent = i18next.t('postsTitle');

  watch(state.form, 'processState', () => {
    const { processState } = state.form;
    const spinnerEl = document.getElementById('spinner');
    switch (processState) {
      case 'filling':
        submitButton.disabled = false;
        inputElement.disabled = false;
        spinnerEl.classList.add('invisible');
        break;
      case 'processing':
        submitButton.disabled = true;
        inputElement.disabled = true;
        spinnerEl.classList.remove('invisible');
        break;
      default:
        throw new Error(`Unknown state: ${processState}`);
    }
    form.reset();
  });

  watch(state.form, 'valid', () => {
    submitButton.disabled = !state.form.valid;
  });

  watch(state.form, 'errors', () => {
    const { errors } = state.form;
    if (_.isEmpty(errors)) {
      inputElement.classList.remove('is-invalid');
    } else {
      inputElement.classList.add('is-invalid');
    }
    const errorElement = inputElement.nextElementSibling;
    errorElement.textContent = state.form.errors.link;
  });

  watch(state, 'activeFeedId', () => {
    const { activeFeedId } = state;
    const { feeds } = state;
    const { posts } = state;
    const containerForFeeds = document.querySelector('[data-container="feeds"]');
    const containerForPosts = document.querySelector('[data-container="posts"]');
    containerForFeeds.innerHTML = '';
    containerForPosts.innerHTML = '';

    feeds.forEach((feedObj) => {
      const cardEl = document.createElement('div');
      containerForFeeds.append(cardEl);
      cardEl.setAttribute('style', 'max-width: 25rem;');
      const cardHeaderEl = document.createElement('div');
      cardHeaderEl.classList.add('card-header');
      cardHeaderEl.textContent = feedObj.feedTitle;
      cardEl.append(cardHeaderEl);
      const cardBodyEl = document.createElement('div');
      cardBodyEl.classList.add('card-body');
      cardEl.append(cardBodyEl);
      const cardTextEl = document.createElement('p');
      cardTextEl.classList.add('card-text');
      cardTextEl.textContent = feedObj.feedDescription;
      cardBodyEl.append(cardTextEl);
      if (feedObj.feedId === activeFeedId) {
        cardEl.classList.add('card', 'text-white', 'bg-primary', 'mb-3');
      } else {
        cardEl.classList.add('card', 'bg-light', 'mb-3');
        cardEl.setAttribute('style', 'max-width: 25rem; cursor: pointer;');
        cardEl.addEventListener('click', (e) => {
          e.preventDefault();
          state.activeFeedId = feedObj.feedId; // eslint-disable-line
        });
      }
    });

    const filteredPosts = _.filter(posts, { feedId: activeFeedId });
    filteredPosts.forEach((postObj) => {
      const liEl = document.createElement('li');
      liEl.classList.add('list-group-item');
      containerForPosts.append(liEl);
      const aEl = document.createElement('a');
      aEl.setAttribute('href', postObj.postLink);
      aEl.textContent = postObj.postTitle;
      liEl.append(aEl);
    });
  });
};
