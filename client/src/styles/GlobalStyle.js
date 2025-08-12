import { createGlobalStyle } from 'styled-components';

export const GlobalStyle = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body, #root { height: 100%; background: ${({theme}) => theme.colors.bg}; }
  body {
    margin: 0;
    font-family: 'Inter', system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    color: ${({theme}) => theme.colors.text};
  }
  a { color: inherit; text-decoration: none; }
  button { font: inherit; }
`;