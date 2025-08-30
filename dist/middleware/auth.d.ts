import type { Request, Response, NextFunction } from 'express';
export declare function authenticate(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
export declare function logUser(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map