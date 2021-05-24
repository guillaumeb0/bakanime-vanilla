document.addEventListener('DOMContentLoaded', async () => {
  document.querySelector('.open-menu-cta').addEventListener('click', () => {
    document.querySelector('.menu').classList.add('menu-opened')
    document.body.classList.add('no-scroll')
  })

  document.querySelector('.close-menu-cta').addEventListener('click', () => {
    document.querySelector('.menu').classList.remove('menu-opened')
    document.body.classList.remove('no-scroll')
  })

  const createCard = ({image_url, title, type, start_date}) => {
    let cardHtmlString = `
<div class="card">
  <img src="${image_url}" alt="${title}_avatar">
  <div class="card-description">
    <h3 class="card-description-title">${title}</h3>
    <div class="play-cta-wrapper">
      <div class="material-icons play-cta">play_circle</div>
    </div>
    <div class="card-description-text">
      <div class="type">${type}</div>
      ${start_date ? `<div class="start-date">${start_date}</div>` : ''}
    </div>
  </div>
</div>
`

    let template = document.createElement('template')
    template.innerHTML = cardHtmlString
    return template.content.firstElementChild
  }

  const populateAnimeList = (htmlList, data) => {
    data.forEach((anime) => {
      let card = createCard({
        image_url: anime.image_url,
        title: anime.title,
        type: anime.type,
        start_date: anime.start_date
      })
      htmlList.appendChild(card)
    })
  }

  const getCurrentDayName = () => new Date().toLocaleDateString('en-GB', {weekday: 'long'})

  const currentDayName = getCurrentDayName()
  let res = await axios.get(`https://api.jikan.moe/v3/schedule/${currentDayName}`)
  const todayReleasesContent = document.querySelector('.today-releases .anime-list-content')
  populateAnimeList(todayReleasesContent, res.data[currentDayName.toLowerCase()])

  res = await axios.get('https://api.jikan.moe/v3/top/anime/1/airing')
  const airingAnimesContent = document.querySelector('.airing-animes .anime-list-content')
  populateAnimeList(airingAnimesContent, res.data.top)

  res = await axios.get('https://api.jikan.moe/v3/top/anime/1/upcoming')
  const topUpcomingContent = document.querySelector('.top-upcoming .anime-list-content')
  populateAnimeList(topUpcomingContent, res.data.top)

  res = await axios.get('https://api.jikan.moe/v3/top/manga')
  const topMangaContent = document.querySelector('.top-manga .anime-list-content')
  populateAnimeList(topMangaContent, res.data.top)
});
