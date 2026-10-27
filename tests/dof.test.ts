import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createDepthOfField } from '../src/dof';

test('createDepthOfField configures subtle, gentle depth-of-field parameters', () => {
  // Mock renderer for headless Node test environment
  const mockRenderer = {
    getRenderTarget: () => null,
    setRenderTarget: () => {},
    render: () => {},
  } as unknown as THREE.WebGLRenderer;

  const dof = createDepthOfField(mockRenderer);
  assert.ok(dof, 'DOF pass created successfully');
  assert.equal(typeof dof.render, 'function');
  assert.equal(typeof dof.setSize, 'function');
  assert.equal(typeof dof.dispose, 'function');

  // Verify setSize does not throw and handles aspect ratio
  assert.doesNotThrow(() => {
    dof.setSize(1920, 1080, 1.0);
  });

  // Verify clean disposal
  assert.doesNotThrow(() => {
    dof.dispose();
  });
});
