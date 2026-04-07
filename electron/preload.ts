// Minimal preload — context bridge can be extended later
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('pintarai', {
  version: process.env.npm_package_version ?? '0.1.0',
  platform: process.platform,
});
