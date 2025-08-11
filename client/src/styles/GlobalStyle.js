import { createGlobalStyle } from 'styled-components';

const GlobalStyle = createGlobalStyle`
  *, *::before, *::after { box-sizing: border-box; }
  html, body, #root { height: 100%; }
  body {
    margin: 0;
    background: ${({theme}) => theme.colors.bg};
    color: ${({theme}) => theme.colors.text};
    font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  a { color: inherit; text-decoration: none; }
  button {
    font: inherit; cursor: pointer; border: 0;
    border-radius: ${({theme}) => theme.radius.sm};
  }
  input, select, textarea {
    font: inherit;
    color: ${({theme}) => theme.colors.text};
    background: ${({theme}) => theme.colors.surface};
    border: 1px solid #1f2937;
    border-radius: ${({theme}) => theme.radius.sm};
    padding: 10px 12px;
    outline: none;
  }
`;
export default GlobalStyle;