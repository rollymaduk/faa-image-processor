import React from 'react';
import { compose, lifecycle } from 'recompose';
import OpenSeaDragon from 'openseadragon';
import PropTypes from 'prop-types';

const id = 'openSeaDragonViewer';

const Component = () => (
  <div id={id} >
      ...loading
  </div>
);

Component.propTypes = {
  tileSources: PropTypes.any,
};


export default compose(lifecycle({
  componentDidMount() {
    const { tileSources } = this.props;
    if (tileSources) {
      new OpenSeaDragon({
        tileSources,
        id,
      });
    }
  },
}))(Component);
