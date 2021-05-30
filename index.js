document.addEventListener('DOMContentLoaded', async () => {
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
    displayedCardCount: 6,
    buckets: [
      {
        name: 'todayReleases',
        animes: await fetchData(`https://api.jikan.moe/v3/schedule/${currentDayName}`, currentDayName.toLowerCase()),
        currentFirstDisplayedCard: 0,
        currentLastDisplayedCard: 6,
        htmlContainer: document.querySelector('.today-releases .anime-list-content')

      },
      {
        name: 'airing',
        animes: await fetchData('https://api.jikan.moe/v3/top/anime/1/airing', 'top'),
        currentFirstDisplayedCard: 0,
        currentLastDisplayedCard: 6,
        htmlContainer: document.querySelector('.airing-animes .anime-list-content')

      },
      {
        name: 'topUpcoming',
        animes: await fetchData('https://api.jikan.moe/v3/top/anime/1/upcoming', 'top'),
        currentFirstDisplayedCard: 0,
        currentLastDisplayedCard: 6,
        htmlContainer: document.querySelector('.top-upcoming .anime-list-content')

      },
      {
        name: 'topManga',
        animes: await fetchData('https://api.jikan.moe/v3/top/manga', 'top'),
        currentFirstDisplayedCard: 0,
        currentLastDisplayedCard: 6,
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

  const createCard = ({id, imageUrl, title, type, startDate}) => {
    const cardHtmlString = `
<div class="card" data-id="${id}">
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
    cards.forEach((card) => list.prepend(card))
  }

  const pruneExtraOuterCards = ({startIndex, bucketLength, htmlList}) => {
    const indexesToPrune = getIndexesToPrune(startIndex, bucketLength)
    console.log(indexesToPrune)
    htmlList.childNodes.forEach(node => {
      if (node.nodeType === 1 && indexesToPrune.includes(parseInt(node.dataset.id))) {
        console.log('to remove:', node)
        htmlList.removeChild(node)
      }
    })
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

  // I'm terrible at maths ! I have no idea how to name this !
  const foo = (num, length) => num >= 0 ? num : length + num

  const getPreviousScrollInfo = (currentStartIndex, length) => {
    const nextRangeStart = foo(currentStartIndex - state.displayedCardCount, length)
    const nextRangeEnd = foo(currentStartIndex - 1, length)

    return {
      rangeStart: nextRangeStart,
      rangeEnd: nextRangeEnd,
      indexes: Array.from({length: state.displayedCardCount}, (_, i) => {
        return foo(nextRangeEnd - i, length)
      }).reverse()
    }
  }

  const getRangeFromIndex = (index, length) => {
    return Array.from({length: state.displayedCardCount}, (_, i) => (index + i) % length)
  }

  const animesToCards = (animes, dataIndexes) => {
    return dataIndexes.map(i => animes[i]).map((anime) => {
      return createCard({
        id: anime.id,
        imageUrl: anime.image_url,
        title: anime.title,
        type: anime.type,
        startDate: anime.start_date
      })
    })
  }

  const getIndexesToPrune = (startIndex, length) => {
    const previousRange = getPreviousScrollInfo(startIndex, length).indexes
    const currentRange = getRangeFromIndex(startIndex, length)
    const nextRange = getRangeFromIndex(startIndex + state.displayedCardCount, length)

    const indexesToKeep = previousRange.concat(currentRange).concat(nextRange)
    console.log('index to keep:', indexesToKeep)
    return Array.from({length: length}, (_, i) => i).filter(e => !indexesToKeep.includes(e))
  }

  Object.values(state.buckets).forEach(bucket => {
    const previousScrollInfo = getPreviousScrollInfo(bucket.currentFirstDisplayedCard, bucket.animes.length)
    const currentRange = getRangeFromIndex(bucket.currentFirstDisplayedCard, bucket.animes.length)
    const nextRange = getRangeFromIndex(bucket.currentFirstDisplayedCard + state.displayedCardCount, bucket.animes.length)
    const previousCards = animesToCards(bucket.animes, previousScrollInfo.indexes)
    const currentCards = animesToCards(bucket.animes, currentRange)
    const nextCards = animesToCards(bucket.animes, nextRange)

    appendAnimeList(bucket.htmlContainer, previousCards.concat(currentCards).concat(nextCards))
    bucket.htmlContainer.scrollBy({top: 0, left: currentCards[0].offsetWidth * state.displayedCardCount})
    markFirstAndLastVisibleCards(bucket.htmlContainer)
  })

  const navigateBeforeButtons = document.querySelectorAll('.navigation-icon.navigate-before')
  navigateBeforeButtons.forEach(button => {

    button.addEventListener('click', async event => {
      const listContent = event.target.closest('.anime-list').querySelector('.anime-list-content')
      const cardWidth = listContent.querySelector('.card').offsetWidth || 0

      const bucket = Object.values(state.buckets).find(value => value.htmlContainer == listContent)
      const previousScrollInfo = getPreviousScrollInfo(bucket.currentFirstDisplayedCard, bucket.animes.length)
      const newCards = animesToCards(bucket.animes, previousScrollInfo.indexes.reverse())

      prependAnimeList(listContent, newCards)
      bucket.currentFirstDisplayedCard = previousScrollInfo.rangeStart
      bucket.currentLastDisplayedCard = previousScrollInfo.rangeEnd

      listContent.scrollBy({
        top: 0,
        left: cardWidth * -state.displayedCardCount,
        behavior: 'smooth'
      })

      setTimeout(() => {
        pruneExtraOuterCards(listContent)
      }, 1000)

      // updateFirstAndLastVisibleCardsOnScrollForward(listContent)
    })
  })

  const navigateNextButtons = document.querySelectorAll('.navigation-icon.navigate-next')
  navigateNextButtons.forEach(button => {
    button.addEventListener('click', event => {
      const listContent = event.target.closest('.anime-list').querySelector('.anime-list-content')
      const cardWidth = listContent.querySelector('.card').offsetWidth || 0

      listContent.scrollBy({
        top: 0,
        left: cardWidth * state.displayedCardCount,
        behavior: 'smooth'
      })

      // Create and append next cards
      const bucket = Object.values(state.buckets).find(value => value.htmlContainer == listContent)
      const nextRange = getRangeFromIndex(
        bucket.currentFirstDisplayedCard + state.displayedCardCount * 2,
        bucket.animes.length
      )

      const newCards = animesToCards(bucket.animes, nextRange)
      appendAnimeList(listContent, newCards)

      // Prune extra outer cards
      pruneExtraOuterCards({
        startIndex: bucket.currentFirstDisplayedCard + state.displayedCardCount,
        bucketLength: bucket.animes.length,
        htmlList: listContent
      })

      // Update bucket info
      bucket.currentFirstDisplayedCard += state.displayedCardCount
      bucket.currentLastDisplayedCard += state.displayedCardCount


      // updateFirstAndLastVisibleCardsOnScrollForward(listContent)
    })
  })
});
