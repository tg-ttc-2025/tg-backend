import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    namespace: 'offense',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  },
})
export class OffenseMoveGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(OffenseMoveGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  // Send individual offense move update
  sendOffenseMoveUpdate(offenseMove: any) {
    this.server.emit('offenseMoveUpdate', offenseMove);
    this.logger.log(`Sent offense move update: ${offenseMove.codeName}`);
  }

  // Send batch updates (useful for multiple drones)
  sendBatchOffenseMoveUpdate(offenseMoves: any[]) {
    this.server.emit('offenseMovesBatchUpdate', offenseMoves);
    this.logger.log(`Sent batch offense move update: ${offenseMoves.length} items`);
  }

  // Send latest positions for all active drones
  sendActiveOffenseMoves(offenseMoves: any[]) {
    this.server.emit('activeOffenseMoves', offenseMoves);
    this.logger.log(`Sent active offense moves: ${offenseMoves.length} drones`);
  }

  sendOffenseMoveDeleted(codeName: string) {
  this.server.emit('offense-move-deleted', { codeName });
  this.logger.log(`Sent offense-move-deleted event for: ${codeName}`);
}
}