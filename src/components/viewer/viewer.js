import React from 'react';
import PropTypes from 'prop-types';
import { compose, lifecycle, defaultProps, branch, renderComponent } from 'recompose';
import Loader from './loader';
import { initializeViewer } from '../helpers';

const id = 'openSeaDragonViewer';


const Component = () => (
  <div id={id} className="imageViewer" />
);
/* eslint react/forbid-prop-types:0 */
/* eslint react/no-unused-prop-types:0 */
/* eslint react/require-default-props:0 */
Component.propTypes = {
  tileSources: PropTypes.any,
  prefixUrl: PropTypes.string,
};


export default compose(
  defaultProps({ prefixUrl: './images/', isFullScreen: true }),
  branch(({ tileSources }) => !tileSources, renderComponent(Loader)),
  lifecycle({
    componentDidMount() {
      const { tileSources, prefixUrl } = this.props;
      initializeViewer(tileSources, prefixUrl, id);
    },
  }),

)(Component);
