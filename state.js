// state.js â€” global data cache & pagination state (loaded first)

let members       = [];
let contributions = [];
let events        = [];
let pledges       = [];

const paginationState = {
  members:       { currentPage: 1, itemsPerPage: 10,  totalItems: 0, searchQuery: '' },
  contributions: { currentPage: 1, itemsPerPage: 20,  totalItems: 0, searchQuery: '' },
  events:        { currentPage: 1, itemsPerPage: 10,  totalItems: 0, searchQuery: '' },
  pledges:       { currentPage: 1, itemsPerPage: 20,  totalItems: 0 }
};
