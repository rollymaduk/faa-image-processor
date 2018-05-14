import React, { Component } from 'react';
import Viewer from './viewer';
import './App.css';

class App extends Component {
  render() {
    return (
      <div className="App">
        <Viewer tileSources={{
tileSources: {
                Image: {
                    xmlns: 'http://schemas.microsoft.com/deepzoom/2008',
                    Url: '/example-images/highsmith/highsmith_files/',
                    Format: 'jpg',
                    Overlap: '2',
                    TileSize: '256',
                    Size: {
                        Height: '9221',
                        Width: '7026',
                    },
                },
            },
}}
        />
      </div>
    );
  }
}

export default App;
