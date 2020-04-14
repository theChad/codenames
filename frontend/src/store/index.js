import Vue from 'vue';
import Vuex from 'vuex';
import createPersistedState from 'vuex-persistedstate'
import * as Cookies from 'js-cookie'

Vue.use(Vuex);
const inFifteenMinutes = new Date(new Date().getTime() + 15 * 60 * 1000);

export default new Vuex.Store({
  plugins: [createPersistedState({
    storage: {
      getItem: key => Cookies.get(key),
      // Please see https://github.com/js-cookie/js-cookie#json, on how to handle JSON.
      setItem: (key, value) => Cookies.set(key, value, {
        expires: inFifteenMinutes
      }),
      removeItem: key => Cookies.remove(key)
    }
  })],
  state: {
    connected: false,
    drawer: false,
    // game-specific stuff TODO: move into a module
    dictionaries: {},
    game: {},
    room: '',
    username: '',
    error: null,
    turn: '',
    spymasterReveal: false,
    popupHides: 0
  },
  getters: {
    words(state) {
      if (state.game.solution) {
        return Object.keys(state.game.solution);
      }
      return [];
    },
    tileCounts(state) {
      if (state.game.solution) {
        const flippedCounts = {};
        const totalCounts = {
          R: 0,
          B: 0,
          G: 0,
          X: 0,
        };
        // compile the counts for each team + assassin
        Object.keys(state.game.solution).forEach((word) => {
          if (state.game.solution[word] !== 'O') {
            flippedCounts[state.game.solution[word]] = flippedCounts[state.game.solution[word]] || 0;
            if (state.game.board[word]) {
              flippedCounts[state.game.board[word]] += 1;
            }
            totalCounts[state.game.solution[word]] = totalCounts[state.game.solution[word]] || 0;
            totalCounts[state.game.solution[word]] += 1;
          }
        });
        return {
          total: totalCounts,
          flipped: flippedCounts,
        };
      }
      return false;
    },
    gameWon(state, getters) {
      if (getters.tileCounts) {
        return getters.tileCounts.flipped.X > 0 ||
          getters.tileCounts.flipped.R === getters.tileCounts.total.R ||
          getters.tileCounts.flipped.B === getters.tileCounts.total.B ||
          getters.tileCounts.flipped.G === getters.tileCounts.total.G;
      }
      return false;
    },
  },
  mutations: {
    set_connected(state, payload) {
      state.connected = payload;
    },
    set_drawer(state, payload) {
      state.drawer = payload;
    },
    set_dictionaries(state, payload) {
      state.dictionaries = payload;
    },
    set_turn(state, team) {
      state.turn = team;
    },
    set_game(state, game) {
      state.game = game;
    },
    set_room(state, room) {
      state.room = room;
    },
    set_username(state, username) {
      state.username = username;
    },
    set_error(state, payload) {
      state.error = payload
    },
    reset_error(state) {
      state.room = null;
      state.error = null;
    },
    reveal_spymaster(state) {
      state.spymasterReveal = true;
    },
    forget_spymaster(state) {
      state.spymasterReveal = false;
    },
    reset_room(state) {
      state.game = {};
      state.spymasterReveal = false;
    },
    incrementPopupHides(state) {
      state.popupHides++
    },
  },
  actions: {
    WS_connect(context) {
      context.commit('set_connected', true);
    },
    WS_disconnect(context) {
      context.commit('set_connected', false);
    },
    WS_message(context, message) {
      context.commit('reset_error')
      context.commit('set_game', message)
      context.commit('set_turn', message.starting_color)
      context.commit('set_room', message.game_id)
    },
    WS_join_room(context, message) {
      context.commit('reset_error')
      context.commit('set_room', message.room)
    },
    WS_list_dictionaries (context, message) {
      context.commit('set_dictionaries', message.dictionaries)
    },
    WS_error(state, message) {
      state.error = message.error;
    },
  }
});
