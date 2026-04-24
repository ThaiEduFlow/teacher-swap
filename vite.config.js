import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // เปลี่ยน 'teacher-swap' เป็นชื่อ repository ของคุณบน GitHub
  // เช่นถ้า repo คุณชื่อ 'my-teacher-app' ให้เปลี่ยนเป็น '/my-teacher-app/'
  base: '/teacher-swap/',
});
