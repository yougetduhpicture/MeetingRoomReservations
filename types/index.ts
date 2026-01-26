export interface Room {
  roomId: string;
  name: string;
}

export interface Reservation {
  reservationId: string;
  roomId: string;
  userId: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}

export interface User {
  userId: string;
  username: string;
  name: string;
  passwordHash: string;
}

export interface TokenPayload {
  userId: string;
  username: string;
}

export interface ApiResponse<T = undefined> {
  message: string;
  data?: T;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface CreateReservationRequest {
  roomId: string;
  startDate: string;
  startTime: string;
  endTime: string;
}
