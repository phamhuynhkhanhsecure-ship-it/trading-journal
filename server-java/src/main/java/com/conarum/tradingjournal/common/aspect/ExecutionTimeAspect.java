package com.conarum.tradingjournal.common.aspect;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Pointcut;
import org.springframework.stereotype.Component;

/**
 * Aspect to track and log execution time of controller endpoints and methods annotated with {@link TrackExecutionTime}.
 */
@Aspect
@Component
@Slf4j
public class ExecutionTimeAspect {

    /**
     * Pointcut that matches:
     * 1. Any method in a class annotated with @RestController or @Controller.
     * 2. Any method annotated with @TrackExecutionTime.
     * 3. Any method in a class annotated with @TrackExecutionTime.
     */
    @Pointcut("@within(org.springframework.web.bind.annotation.RestController) || " +
              "@within(org.springframework.stereotype.Controller) || " +
              "@annotation(com.conarum.tradingjournal.common.aspect.TrackExecutionTime) || " +
              "@within(com.conarum.tradingjournal.common.aspect.TrackExecutionTime)")
    public void trackExecutionTimePointcut() {}

    /**
     * Around advice to measure and log execution time of matched methods.
     */
    @Around("trackExecutionTimePointcut()")
    public Object logExecutionTime(ProceedingJoinPoint joinPoint) throws Throwable {
        long startTime = System.currentTimeMillis();
        String className = joinPoint.getSignature().getDeclaringType().getSimpleName();
        String methodName = joinPoint.getSignature().getName();
        String fullMethodName = className + "." + methodName + "()";

        log.debug("[API EXECUTION] Starting execution of: {}", fullMethodName);

        try {
            Object result = joinPoint.proceed();
            long duration = System.currentTimeMillis() - startTime;
            log.info("[API EXECUTION] Finished: {} - Status: SUCCESS - Duration: {} ms", fullMethodName, duration);
            return result;
        } catch (Throwable throwable) {
            long duration = System.currentTimeMillis() - startTime;
            log.error("[API EXECUTION] Failed: {} - Status: ERROR ({}) - Duration: {} ms", 
                    fullMethodName, throwable.getClass().getSimpleName(), duration);
            
            // Re-throw exception to allow GlobalExceptionHandler (@RestControllerAdvice) to handle it
            throw throwable;
        }
    }
}
