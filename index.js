document.addEventListener('DOMContentLoaded', () => {
  console.log('yo')

  document.querySelector('.open-menu-cta').addEventListener('click', () => {
    document.querySelector('.menu').classList.add('menu-opened')
    document.body.classList.add('no-scroll')
  })

  document.querySelector('.close-menu-cta').addEventListener('click', () => {
    document.querySelector('.menu').classList.remove('menu-opened')
    document.body.classList.remove('no-scroll')
  })
});
