/**
 * @format
 */

import 'react-native';
import React from 'react';
import {act} from 'react-test-renderer';
import renderer from 'react-test-renderer';
import App from '../App';

it('renders without crashing', async () => {
  await act(async () => {
    const tree = renderer.create(<App />);
    expect(tree).toBeTruthy();
    await Promise.resolve();
  });
});
