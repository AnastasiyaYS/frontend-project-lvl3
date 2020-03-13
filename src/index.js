import i18next from 'i18next';
import ru from './locales/ru';
import init from './init';

i18next.init({
  lng: 'ru',
  debug: true,
  resources: {
    ru,
  },
}).then(() => {
  init();
});
