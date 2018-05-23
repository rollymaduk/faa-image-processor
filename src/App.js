import React from 'react';
import { withState, lifecycle, compose } from 'recompose';
import Viewer from './components/viewer';
import './App.css';
import { getTileSources, prepareParamsFromUrl } from './components/helpers';

const App = ({ tileSources }) => {
  return (
    <div className="App">
      <Viewer tileSources={tileSources} />
    </div>
  );
};


/* class App extends Component {
  render() {
    const { tileSources } = this.props;
    return (
      <div className="App">
        <Viewer tileSources={tileSources} />
      </div>
    );
  }
} */

export default compose(
  withState('tileSources', 'setTileSources', null),
  lifecycle({
    componentDidMount() {
      const { setTileSources } = this.props;
      // setTileSources('https://storage.googleapis.com/faac-image-viewer-react.appspot.com/IMG_1233/IMG_1233.dzi')
      const params = prepareParamsFromUrl();
      getTileSources(params)
        .then(setTileSources);
    },
  }),
)(App);
