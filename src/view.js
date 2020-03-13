import { watch } from 'melanke-watchjs';
import _ from 'lodash';

export default (state) => {
  const inputElement = document.getElementById('link');
  const form = document.querySelector('[data-form="add-feed"]');
  const submitButton = form.querySelector('input[type="submit"]');

  watch(state.form, 'processState', () => {
    const { processState } = state.form;
    const spinnerEl = document.querySelector('#spinner');
    switch (processState) {
      case 'filling':
        submitButton.disabled = false;
        inputElement.disabled = false;
        spinnerEl.setAttribute('style', 'margin-top: 15px; visibility: hidden');
        break;
      case 'processing':
        submitButton.disabled = true;
        inputElement.disabled = true;
        spinnerEl.removeAttribute('style');
        spinnerEl.setAttribute('style', 'margin-top: 15px;');
        break;
      default:
        throw new Error(`Unknown state: ${processState}`);
    }
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

  watch(state.output, 'activeFeedId', () => {
    const { activeFeedId } = state.output;
    const { feedList } = state.output;
    const { newsList } = state.output;
    const feedsContainer = document.querySelector('[data-container="feeds"]');
    const newsContainer = document.querySelector('[data-container="news"]');
    feedsContainer.innerHTML = '';
    newsContainer.innerHTML = '';

    feedList.forEach((feedObj) => {
      const cardEl = document.createElement('div');
      feedsContainer.append(cardEl);
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
          state.output.activeFeedId = feedObj.feedId; // eslint-disable-line
        });
      }
    });

    const newsListFiltered = _.filter(newsList, { feedId: activeFeedId });
    newsListFiltered.forEach((newsObj) => {
      const liEl = document.createElement('li');
      liEl.classList.add('list-group-item');
      newsContainer.append(liEl);
      const aEl = document.createElement('a');
      aEl.setAttribute('href', newsObj.newsLink);
      aEl.textContent = newsObj.newsTitle;
      liEl.append(aEl);
    });

    form.reset();
  });
};
