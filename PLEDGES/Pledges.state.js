// ============================================
// PLEDGES.STATE.JS — Shared in-memory state
// ============================================

 window .pledgeState = {
    pledges: [],
    pledgePayments: [],
    initialized: false,
    currentPledgeId: null,

    pagination: {
        currentPage: 1,
        itemsPerPage: 20,
        totalItems: 0,
        filteredPledges: []
    },

    reset() {
        this.pagination.filteredPledges = [];
        this.pagination.currentPage = 1;
        this.pagination.totalItems = this.pledges.length;
    }
};