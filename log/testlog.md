[GameController.prepareGame] Input difficulty: HARD, current state difficulty: MEDIUM
GameController.ts:136 [GameController.prepareGame] After setting, difficulty: HARD
BoardRenderer.ts:738 [BoardRenderer] Updating board height: 6 -> 8
BoardRenderer.ts:671 [WinHighlight] Cleared all win/lose highlights
GameController.ts:161 [GameController] Player will be BLACK (first)
GameController.ts:171 [GameController] Beginning game, player is BLACK
GameController.ts:217 [GameController.handleStateChange] SELECT_ORDER → PLAYER_TURN undefined
GameController.ts:230 [GameController] PLAYER_TURN: enabling input
GameController.ts:494 [GameController.enableInput] Enabling input, current state: PLAYER_TURN
GameController.ts:177 [GameController] Game started: player goes first
GameController.ts:276 [GameController] Player click at (2, 2)
GameController.ts:303 [GameController] Piece placed at (2, 2, 0)
GameController.ts:217 [GameController.handleStateChange] PLAYER_TURN → PLAYER_TURN Object
GameController.ts:310 [GameController] Player drop animation complete, checking game state...
GameController.ts:311 [GameController] Current state: PLAYER_TURN, turn: BLACK
GameController.ts:326 [GameController] No winner, switching turn...
GameState.ts:305 [GameState.switchTurn] turn: BLACK -> WHITE, playerPiece: BLACK, aiPiece: WHITE, isAITurn: true
GameController.ts:217 [GameController.handleStateChange] PLAYER_TURN → AI_TURN undefined
GameController.ts:239 [GameController] AI_TURN: disabling input, starting AI turn
GameController.ts:505 [GameController.disableInput] Disabling input, current state: AI_TURN
GameController.ts:336 [GameController] AI turn starting...
AIPlayer.ts:136 [AI Debug] 棋盘状态: 1颗棋子
AIPlayer.ts:137 [AI Debug] AI视角: WHITE, 难度: HARD, 搜索深度: 4
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1655.75, total: -1655.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (0,0,0) => score=-1655.75
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1956.75, total: -1956.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (0,1,0) => score=-1956.75
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1956.75, total: -1956.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (0,2,0) => score=-1956.75
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1956.75, total: -1956.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (0,3,0) => score=-1956.75
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1956.75, total: -1956.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (0,4,0) => score=-1956.75
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1926, total: -1926 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (1,0,0) => score=-1926
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1939, total: -1939 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (1,1,0) => score=-1939
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -2328, total: -2328 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (1,2,0) => score=-2328
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1939, total: -1939 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (1,3,0) => score=-1939
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1956.75, total: -1956.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (1,4,0) => score=-1956.75
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1956.75, total: -1956.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (2,0,0) => score=-1956.75
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -2329.25, total: -2329.25 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (2,1,0) => score=-2329.25
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -2092.75, total: -2092.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (2,2,1) => score=-2092.75
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -2367.75, total: -2367.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (2,3,0) => score=-2367.75
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1956.75, total: -1956.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (2,4,0) => score=-1956.75
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1956.75, total: -1956.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (3,0,0) => score=-1956.75
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1943, total: -1943 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (3,1,0) => score=-1943
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -2367.75, total: -2367.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (3,2,0) => score=-2367.75
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1931, total: -1931 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (3,3,0) => score=-1931
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1956.75, total: -1956.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (3,4,0) => score=-1956.75
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1956.75, total: -1956.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (4,0,0) => score=-1956.75
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1956.75, total: -1956.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (4,1,0) => score=-1956.75
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1956.75, total: -1956.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (4,2,0) => score=-1956.75
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1956.75, total: -1956.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (4,3,0) => score=-1956.75
AIPlayer.ts:198 [AI Debug]   -> Layer1 score: 0
AIPlayer.ts:216 [AI Debug]   -> Layer2 score: 0
AIPlayer.ts:242 [AI Debug]   -> Layer4 minimax: -1655.75, total: -1655.75 (L1=0, L2=0)
AIPlayer.ts:147 [AI Debug] (4,4,0) => score=-1655.75
AIPlayer.ts:161 [AI] Best move (0, 0) score: -1655.75, nodes: 52697
GameController.ts:344 [GameController] AI decision: (0, 0)