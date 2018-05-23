import axios from 'axios';
import window from 'window-or-global';
import OpenSeaDragon from 'openseadragon';
// todo: get a better way to store the url, perhaps an environment variable
const defaultBaseUrl =
    'https://us-central1-faac-image-viewer-react.cloudfunctions.net/processImageforViewer/faac-image-viewer-react.appspot.com';


export const prepareParamsFromUrl = () => {
  const vars = {};
  window.location.search.replace(
    /[?&]+([^=&]+)=([^&]*)/gi,
    (m, key, value) => {
      vars[key] = value;
    },
  );
  return vars;
};

export const getTileSources = (params, baseURl = defaultBaseUrl) => {
  return axios.get(baseURl, { params })
    .then(response => response.data);
};

export const initializeViewer = (tileSources, prefixUrl, id) => {
  if (tileSources) {
    const viewer = new OpenSeaDragon({
      prefixUrl,
      id,
    });
    viewer.open(tileSources);
    viewer.setFullPage(true);
  }
};
