document.addEventListener('DOMContentLoaded', async () => {
  const currentDayName = (() => new Date().toLocaleDateString('en-GB', {weekday: 'long'}))()

  const fetchData = async (url, responseKey) => {
    try {
      const res = await axios.get(url)
      return res.data[responseKey]
    } catch (error) {
      return null
    }
  }

  window.state = {
    displayedCardCount: 6,
    buckets: [
      {
        name: 'todayReleases',
        animes: await fetchData(`https://api.jikan.moe/v3/schedule/${currentDayName}`, currentDayName.toLowerCase()),
        displayCursor: 0,
        htmlContainer: document.querySelector('.today-releases .anime-list-content')

      },
      {
        name: 'airing',
        animes: await fetchData('https://api.jikan.moe/v3/top/anime/1/airing', 'top'),
        displayCursor: 0,
        htmlContainer: document.querySelector('.airing-animes .anime-list-content')

      },
      {
        name: 'topUpcoming',
        animes: await fetchData('https://api.jikan.moe/v3/top/anime/1/upcoming', 'top'),
        displayCursor: 0,
        htmlContainer: document.querySelector('.top-upcoming .anime-list-content')

      },
      {
        name: 'topManga',
        animes: await fetchData('https://api.jikan.moe/v3/top/manga', 'top'),
        displayCursor: 0,
        htmlContainer: document.querySelector('.top-manga .anime-list-content')

      },
    ]
  }

  document.querySelector('.open-menu-cta').addEventListener('click', () => {
    document.querySelector('.menu').classList.add('menu-opened')
    document.body.classList.add('no-scroll')
  })

  document.querySelector('.close-menu-cta').addEventListener('click', () => {
    document.querySelector('.menu').classList.remove('menu-opened')
    document.body.classList.remove('no-scroll')
  })

  const createCard = ({image_url, title, type, start_date}) => {
    const cardHtmlString = `
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

    const template = document.createElement('template')
    template.innerHTML = cardHtmlString
    return template.content.firstElementChild
  }

  const appendAnimeList = (list, data) => {
    data.forEach((anime) => {
      let card = createCard({
        image_url: anime.image_url,
        title: anime.title,
        type: anime.type,
        start_date: anime.start_date
      })
      list.appendChild(card)
    })
  }

  const prependAnimeList = (list, data) => {
    data.forEach((anime) => {
      let card = createCard({
        image_url: anime.image_url,
        title: anime.title,
        type: anime.type,
        start_date: anime.start_date
      })
      list.prepend(card)
    })
  }

  const deleteCards = (list, nodes) => {
    nodes.forEach(node => list.removeChild(node))
  }

  const markFirstAndLastVisibleCards = (list) => {
    // Get all visible elements, sort them, then add data attributes to know first and last visible in the scroll
    //  bar
    const visibleElements = Array.from(list.querySelectorAll('.card')).filter((card) => {
      const bounding = card.getBoundingClientRect()
      return (bounding.left >= 0 && bounding.left < window.innerWidth)
    })

    const orderedVisibleElements = visibleElements
      .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left)

    orderedVisibleElements[0].dataset.visibleScrollPosition = 'first'
    orderedVisibleElements[orderedVisibleElements.length - 1].dataset.visibleScrollPosition = 'last'
  }

  Object.values(state.buckets).forEach(bucket => {
    appendAnimeList(bucket.htmlContainer, bucket.animes.slice(bucket.displayCursor, state.displayedCardCount))
    markFirstAndLastVisibleCards(bucket.htmlContainer)
  })

  // I'm terrible at maths ! I have no idea how to name this !
  const foo = (num, length) => num >= 0 ? num : length + num

  const getPreviousScrollInfo = bucket => {
    const length = bucket.animes.length
    const nextRangeStart = foo(bucket.displayCursor - state.displayedCardCount, length)
    const nextRangeEnd = foo(bucket.displayCursor - 1, length)

    return {
      rangeStart: nextRangeStart,
      indexes: Array.from({length: state.displayedCardCount}, (_, i) => {
        return foo(nextRangeEnd - i, length)
      })
    }
  }

  const navigateBeforeButtons = document.querySelectorAll('.navigation-icon.navigate-before')
  navigateBeforeButtons.forEach(button => {

    button.addEventListener('click', async event => {
      const listContent = event.target.closest('.anime-list').querySelector('.anime-list-content')
      const cardWidth = listContent.querySelector('.card').offsetWidth || 0

      const bucket = Object.values(state.buckets).find(value => value.htmlContainer == listContent)
      const currentCards = Array.from(listContent.childNodes)
      const previousScrollInfo = getPreviousScrollInfo(bucket)

      const newCardsData = previousScrollInfo.indexes.map(i => bucket.animes[i])
      prependAnimeList(listContent, newCardsData)
      bucket.displayCursor = previousScrollInfo.rangeStart

      listContent.scrollBy({
        top: 0,
        left: cardWidth * -state.displayedCardCount,
        behavior: 'smooth'
      })

      setTimeout(() => {
        deleteCards(listContent, currentCards)
      }, 1000)

      // updateFirstAndLastVisibleCardsOnScrollForward(listContent)
    })
  })

  const getNextScrollInfo = bucket => {
    const nextRangeStart = bucket.displayCursor + state.displayedCardCount
    const length = bucket.animes.length

    return {
      rangeStart: nextRangeStart,
      indexes: Array.from({length: state.displayedCardCount}, (_, i) => (nextRangeStart + i) % length)
    }
  }

  const navigateNextButtons = document.querySelectorAll('.navigation-icon.navigate-next')
  navigateNextButtons.forEach(button => {
    button.addEventListener('click', event => {
      const listContent = event.target.closest('.anime-list').querySelector('.anime-list-content')
      const cardWidth = listContent.querySelector('.card').offsetWidth || 0

      const bucket = Object.values(state.buckets).find(value => value.htmlContainer == listContent)
      const currentCards = Array.from(listContent.childNodes)
      const nextScrollInfo = getNextScrollInfo(bucket)
      const newCardsData = nextScrollInfo.indexes.map(i => bucket.animes[i])
      appendAnimeList(listContent, newCardsData)
      bucket.displayCursor = nextScrollInfo.rangeStart

      listContent.scrollBy({
        top: 0,
        left: cardWidth * state.displayedCardCount,
        behavior: 'smooth'
      })

      setTimeout(() => {
        deleteCards(listContent, currentCards)
      }, 1000)


      // updateFirstAndLastVisibleCardsOnScrollForward(listContent)
    })
  })
});
