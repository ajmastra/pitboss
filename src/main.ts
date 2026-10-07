import '@fontsource-variable/inter/wght.css';
import '@fontsource/fraunces/latin-600.css';
import '@fontsource/fraunces/latin-700.css';
import './styles/tokens.css';
import './styles/base.css';

const app = document.getElementById('app');
if (app) {
  app.innerHTML = `<main id="main" style="margin:auto;text-align:center;padding:32px">
    <h1 style="font-size:var(--fs-3xl);color:var(--accent-300)">Count It</h1>
    <p style="color:var(--text-dim)">Hi-Lo card counting trainer — coming together.</p>
  </main>`;
}
