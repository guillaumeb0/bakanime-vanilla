document.addEventListener('DOMContentLoaded', async () => {
  const calculateCurrentCardCount = () => {
    if (window.innerWidth < 294) {
      return 3
    } else if (window.innerWidth >= 294 && window.innerWidth < 628) {
      return 4
    } else if (window.innerWidth >= 628 && window.innerWidth < 888) {
      return 5
    } else {
      return 6
    }
  }

  const currentDayName = (() => new Date().toLocaleDateString('en-GB', {weekday: 'long'}))()

  const fetchData = async (url, responseKey) => {
    try {
      const res = await axios.get(url)
      return res.data[responseKey].map((e, i) => ({id: i, ...e}))
    } catch (error) {
      return null
    }
  }

  window.state = {
    displayedCardCount: calculateCurrentCardCount(),
    buckets: [
      {
        name: 'todayReleases',
        animes: await fetchData(`https://api.jikan.moe/v3/schedule/${currentDayName}`, currentDayName.toLowerCase()),
        currentFirstDisplayedCard: 0,
        htmlContainer: document.querySelector('.today-releases .list'),
        isScrolling: false
      },
      {
        name: 'airing',
        animes: await fetchData('https://api.jikan.moe/v3/top/anime/1/airing', 'top'),
        currentFirstDisplayedCard: 0,
        htmlContainer: document.querySelector('.airing-animes .list'),
        isScrolling: false
      },
      {
        name: 'topUpcoming',
        animes: await fetchData('https://api.jikan.moe/v3/top/anime/1/upcoming', 'top'),
        currentFirstDisplayedCard: 0,
        htmlContainer: document.querySelector('.top-upcoming .list'),
        isScrolling: false
      },
      {
        name: 'topManga',
        animes: await fetchData('https://api.jikan.moe/v3/top/manga', 'top'),
        currentFirstDisplayedCard: 0,
        htmlContainer: document.querySelector('.top-manga .list'),
        isScrolling: false
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

  window.onresize = () => {
    if (state.displayedCardCount !== calculateCurrentCardCount()) {
      state.displayedCardCount = calculateCurrentCardCount()
      initializeBuckets()
    }
  }

  // Id only useful for debugging purpose.
  const createCard = ({id, malId, imageUrl, title, type, startDate, klass}) => {
    const cardHtmlString = `
<div class="card${klass ? ` ${klass}` : ''}" data-id="${id}" data-mal-id="${malId}">
  <div class="aspect-ratio-card-wrapper">
  <img src="${imageUrl}" alt="${title}_avatar">
    <div class="card-description">
      <h3 class="card-description-title">${title}</h3>
      <div class="play-cta-wrapper">
        <div class="material-icons play-cta">play_circle</div>
      </div>
      <div class="card-description-text">
        <div class="type">${type}</div>
        ${startDate ? `<div class="start-date">${startDate}</div>` : ''}
      </div>
    </div>
  </div>
</div>
`

    const template = document.createElement('template')
    template.innerHTML = cardHtmlString
    return template.content.firstElementChild
  }

  const appendAnimeList = (list, cards) => {
    Array.from(cards).forEach((card) => {
      list.appendChild(card)
    })
  }

  const prependAnimeList = (list, cards) => {
    cards.forEach(card => list.prepend(card))
  }

  // I'm terrible at maths ! I have no idea how to name this !
  const foo = (num, length) => (num >= 0 ? num : length + num) % length

  const getReversedRange = (nextRangeEnd, length) => {
    return Array.from({length: state.displayedCardCount}, (_, i) => {
      const cycledNumber = (nextRangeEnd - i) % length
      return foo(cycledNumber, length)
    })
  }

  const getRangeFromIndex = (index, length) => {
    return Array.from({length: state.displayedCardCount}, (_, i) => (index + i) % length)
  }

  const animesToCards = (animes, dataIndexes, klass) => {
    return dataIndexes.map(i => animes[i]).map((anime) => {
      return createCard({
        id: anime.id,
        malId: anime.mal_id,
        imageUrl: anime.image_url,
        title: anime.title,
        type: anime.type,
        startDate: anime.start_date,
        klass
      })
    })
  }

  const initializeBuckets = () => {
    Object.values(state.buckets).forEach(bucket => {
      bucket.htmlContainer.textContent = ''
      const reversedRange = getReversedRange(bucket.currentFirstDisplayedCard - 1, bucket.animes.length).reverse()
      const currentRange = getRangeFromIndex(bucket.currentFirstDisplayedCard, bucket.animes.length)
      const nextRange = getRangeFromIndex(bucket.currentFirstDisplayedCard + state.displayedCardCount, bucket.animes.length)
      const previousCards = animesToCards(bucket.animes, reversedRange)
      const currentCards = animesToCards(bucket.animes, currentRange)
      const nextCards = animesToCards(bucket.animes, nextRange)

      appendAnimeList(bucket.htmlContainer, previousCards.concat(currentCards).concat(nextCards))
    })
  }

  initializeBuckets()

  const navigateBeforeButtons = document.querySelectorAll('.navigation-icon.navigate-before')
  navigateBeforeButtons.forEach(button => {

    button.addEventListener('click', event => {
      const listContent = event.target.closest('.anime-list').querySelector('.list')
      const bucket = Object.values(state.buckets).find(value => value.htmlContainer == listContent)

      if (bucket.isScrolling) return
      bucket.isScrolling = true

      const nextRangeEnd = bucket.currentFirstDisplayedCard - 1
      const reversedRange = getReversedRange(nextRangeEnd - state.displayedCardCount, bucket.animes.length)
      const newCards = animesToCards(bucket.animes, reversedRange, 'width-0')

      prependAnimeList(listContent, newCards)
      setTimeout(() => newCards.forEach(card => card.classList.remove('width-0')), 0)

      // Remove last cards. No transition needed since no impact on the scroll
      const cards = Array.from(listContent.querySelectorAll('.card'))
      const nodesToPrune = cards.slice(cards.length - state.displayedCardCount, cards.length)
      nodesToPrune.forEach(element => listContent.removeChild(element))

      bucket.currentFirstDisplayedCard = foo(bucket.currentFirstDisplayedCard - state.displayedCardCount, bucket.animes.length)

      setTimeout(() => bucket.isScrolling = false, 600)
    })
  })

  const navigateNextButtons = document.querySelectorAll('.navigation-icon.navigate-next')
  navigateNextButtons.forEach(button => {
    button.addEventListener('click', event => {
      const listContent = event.target.closest('.anime-list').querySelector('.list')
      const bucket = Object.values(state.buckets).find(value => value.htmlContainer == listContent)

      if (bucket.isScrolling) return
      bucket.isScrolling = true

      const nodesToPrune = Array.from(listContent.querySelectorAll('.card')).slice(0, state.displayedCardCount)
      nodesToPrune.forEach(node => {
        node.classList.add('width-0')
        node.addEventListener('transitionend', e => {
          listContent.removeChild(e.target)
        })
      })

      const nextRange = getRangeFromIndex(
        bucket.currentFirstDisplayedCard + state.displayedCardCount * 2,
        bucket.animes.length
      )

      const newCards = animesToCards(bucket.animes, nextRange)
      appendAnimeList(listContent, newCards)

      bucket.currentFirstDisplayedCard = foo(bucket.currentFirstDisplayedCard + state.displayedCardCount, bucket.animes.length)

      setTimeout(() => bucket.isScrolling = false, 600)
    })
  })

  const initializeYTPlayer = ({url}) => {
    state.YTPlayer = new YT.Player('trailer-modal', {
      events: {
        'onReady': (e) => e.target.loadVideoByUrl(url),
      }
    })
  }

  const startTrailer = ({url}) => {
    document.querySelector('.modal-wrapper').classList.remove('hidden')
    document.querySelector('#modal-backdrop').classList.remove('hidden')
    document.querySelector('body').classList.add('no-vertical-scroll')

    if (!state.YTPlayer) {
      initializeYTPlayer({url})
    } else {
      state.YTPlayer.loadVideoByUrl(url)
    }
  }

  document.querySelector('#modal-backdrop').addEventListener('click', e => {
    e.target.classList.add('hidden')
    document.querySelector('.modal-wrapper').classList.add('hidden')
    document.querySelector('body').classList.remove('no-vertical-scroll')

    state.YTPlayer.stopVideo()
  })

  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('click', async e => {
      const res = await axios.get(`https://api.jikan.moe/v3/anime/${e.currentTarget.dataset.malId}`)
      startTrailer({url: res.data.trailer_url})
    })
  })
});
