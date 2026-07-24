(async function () {
  await initPage('explore');

  const grid = document.getElementById('results-grid');
  const pagination = document.getElementById('pagination');
  const searchForm = document.getElementById('search-form');
  const searchInput = document.getElementById('search-input');
  const categoryFilter = document.getElementById('category-filter');
  const sortFilter = document.getElementById('sort-filter');

  let currentPage = 1;
  let user = await Auth.currentUser();

  const initialCategory = qs('category') || '';
  const initialSearch = qs('search') || '';
  categoryFilter.value = initialCategory;
  searchInput.value = initialSearch;

  async function render() {
    grid.innerHTML = loaderHTML('Loading software');

    const params = new URLSearchParams({
      page: currentPage, limit: 8,
      category: categoryFilter.value, search: searchInput.value.trim(), sort: sortFilter.value,
    });

    let result;
    try {
      result = await api.get(`/software?${params.toString()}`);
    } catch (err) {
      grid.innerHTML = emptyHTML('Could not load software right now.');
      return;
    }

    const { data: items, totalPages } = result;

    if (items.length === 0) {
      grid.innerHTML = emptyHTML('No software matched your filters.');
      pagination.innerHTML = '';
      return;
    }

    const wishlist = (user?.wishlist || []).map(String);
    grid.innerHTML = items.map(item => renderSoftwareCard(item, { showWishlist: true, isWishlisted: wishlist.includes(String(item._id)) })).join('');
    attachWishlistHandlers(grid, user, (freshWishlist) => { if (user) user.wishlist = freshWishlist; });

    pagination.innerHTML = Array.from({ length: totalPages }, (_, i) => i + 1)
      .map(p => `<button data-page="${p}" class="${p === currentPage ? 'active' : ''}">${p}</button>`)
      .join('');

    pagination.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = Number(btn.dataset.page);
        render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  searchForm.addEventListener('submit', (e) => { e.preventDefault(); currentPage = 1; render(); });
  categoryFilter.addEventListener('change', () => { currentPage = 1; render(); });
  sortFilter.addEventListener('change', () => { currentPage = 1; render(); });

  render();
})();
